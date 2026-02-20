'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'switch' | 'textarea' | 'select' | 'password'; // ADICIONAR 'password' AQUI
  required?: boolean;
  options?: { value: string; label: string }[];
}

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  title: string;
  fields: Field[];
  initialData?: any;
  schema: z.ZodObject<any>;
  children?: React.ReactNode;
}

export function FormModal({
  open,
  onClose,
  onSubmit,
  title,
  fields,
  initialData,
  schema,
  children,
}: FormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {},
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    } else {
      reset({});
    }
  }, [initialData, reset, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        {children ? (
          // Se tiver children, renderiza o conteúdo personalizado
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {children}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        ) : (
          // Se não tiver children, renderiza o formulário padrão
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                
                {field.type === 'switch' ? (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={field.name}
                      checked={watch(field.name)}
                      onCheckedChange={(checked) => setValue(field.name, checked)}
                    />
                    <span className="text-sm text-gray-600">
                      {watch(field.name) ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    {...register(field.name)}
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={field.name}
                    {...register(field.name)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Selecione...</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'password' ? (  // ADICIONAR ESTE BLOCO AQUI
                  <Input
                    id={field.name}
                    type="password"
                    {...register(field.name)}
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    {...register(field.name)}
                  />
                )}
                
                {errors[field.name] && (
                  <p className="text-sm text-red-500">
                    {errors[field.name]?.message as string}
                  </p>
                )}
              </div>
            ))}
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}